import React, {PropTypes} from 'react';
import S3Upload from 'react-s3-uploader-multipart/s3upload';
import Dropzone from 'react-dropzone';

export default class DropzoneS3Uploader extends React.Component {

  static propTypes = {
    filename: PropTypes.string,
    s3Url: PropTypes.string.isRequired,
    notDropzoneProps: PropTypes.array.isRequired,
    isImage: PropTypes.func.isRequired,
    passChildrenProps: PropTypes.bool,
    uploadOnDrop: PropTypes.bool,

    imageComponent: PropTypes.func,
    fileComponent: PropTypes.func,
    progressComponent: PropTypes.func,
    errorComponent: PropTypes.func,

    children: PropTypes.oneOfType([
      PropTypes.node,
      PropTypes.func,
    ]),

    onDrop: PropTypes.func,
    onError: PropTypes.func,
    onProgress: PropTypes.func,
    onFinish: PropTypes.func,

    // Passed to react-s3-uploader
    upload: PropTypes.object.isRequired,

    // Default styles for react-dropzone
    className: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.object,
    ]),
    style: PropTypes.object,
    activeStyle: PropTypes.object,
    rejectStyle: PropTypes.object,
  }

  static defaultProps = {
    upload: {},
    className: 'react-dropzone-s3-uploader',
    passChildrenProps: true,
    uploadOnDrop: true,
    isImage: filename => filename && filename.match(/\.(jpeg|jpg|gif|png|svg)/i),
    notDropzoneProps: ['onFinish', 'onDrop', 's3Url', 'filename', 'host', 'upload',
                       'isImage', 'notDropzoneProps', 'uploadOnDrop'],

    style: {
      width: 200,
      height: 200,
      border: 'dashed 2px #999',
      borderRadius: 5,
      position: 'relative',
      cursor: 'pointer',
      overflow: 'hidden',
    },
    activeStyle: {
      borderStyle: 'solid',
      backgroundColor: '#eee',
    },
    rejectStyle: {
      borderStyle: 'solid',
      backgroundColor: '#ffdddd',
    },
  }

  constructor(props) {
    super()
    const uploadedFiles = []
    const {filename} = props
    if (filename) {
      uploadedFiles.push({
        filename,
        fileUrl: this.fileUrl(props.s3Url, filename),
        default: true,
        file: {},
      })
    }
    this.state = {
      uploadedFiles: uploadedFiles,
      selectedFiles: [],
      activeUpload: null
    };
  }

  componentWillMount = () => {
    this.setUploaderOptions(this.props);
    this._mounted = true;
  }

  componentWillUnmount = () => {
    this._mounted = false;
  }

  componentWillReceiveProps = props => this.setUploaderOptions(props)

  setUploaderOptions = props => {
    this.setState({
      uploaderOptions: Object.assign({
        signingUrl: '/s3/sign',
        contentDisposition: 'auto',
        uploadRequestHeaders: {'x-amz-acl': 'public-read'},
        onFinishS3Put: this.handleFinish,
        onProgress: this.handleProgress,
        onError: this.handleError
      }, props.upload)
    });
  }

  clearSelectedFiles = () => {
    this.setState(
      {...this.state,
       error: null,
       progress: null,
       selectedFiles: []}
    );
  }

  clearSelectedFiles = () => {
    this.setState(
      {...this.state,
       error: null,
       progress: null,
       selectedFiles: []}
    );
  }

  handleProgress = (progress, textState, file, stats) => {
    this.props.onProgress && this.props.onProgress(progress, textState, file, stats);
    
    if(this._mounted){
      this.setState({progress});
    }
  }

  handleError = err => {
    this.props.onError && this.props.onError(err);
    if(this._mounted){
      this.setState({error: err, progress: null, activeUpload: null,
                     activeUploadOptions: null});
    }
  }

  handleFinish = (info, file) => {
    const uploadedFile = Object.assign({
      file,
      fileUrl: this.fileUrl(this.props.s3Url, info.filename)
    }, info);

    const uploadedFiles = this.state.uploadedFiles;
    uploadedFiles.push(uploadedFile);

    if(this._mounted){
      this.setState(
        {uploadedFiles, error: null, progress: null, selectedFiles: [],
         activeUpload: null, activeUploadOptions: null},
        () => {
          this.props.onFinish && this.props.onFinish(uploadedFile);
        }
      );
    } else {
      // Even if the component isn't mounted anymore we want to call the
      // callback onFinish method even if we're not modifying the component's
      // internal state.
      this.props.onFinish && this.props.onFinish(uploadedFile);
    }
  }

  handleDrop = (files, rejectedFiles) => {
    const options = {
      files,
      ...this.state.uploaderOptions
    };
    const newState = {
      uploadedFiles: [],
      error: null,
      progress: null,
      selectedFiles: files
    };
    this.setState(newState);

    this.props.onDrop && this.props.onDrop(files, rejectedFiles);
    if (this.props.uploadOnDrop){
      this.startFileUpload(options, newState);
    }
  }
  
  startFileUpload = (files=null, state=null) => {
    const options = {
      files: files !== null ? files: this.state.selectedFiles,
      ...this.state.uploaderOptions
    };

    this.setState({
      ...this.state,
      ...state,
      activeUploadOptions: options,
      activeUpload: new S3Upload(options)
    });
  }

  abortUpload = (filenames=null) => {
    if (!this.state.activeUpload){
      return;
    }
    if (filenames){
      for (let i=0; i < filenames.length; i++) {
        this.state.activeUpload.abortUpload(filenames[i]);
      }
    } else {
      this.state.activeUpload.abortUpload();
    }
  }

  fileUrl = (s3Url, filename) => `${s3Url.endsWith('/') ? s3Url.slice(0, -1) : s3Url}/${filename}`

  renderImage = ({uploadedFile}) => (<div className="rdsu-image"><img src={uploadedFile.fileUrl} /></div>)

  renderFile = ({uploadedFile}) => (
    <div className="rdsu-file">
      <div className="rdsu-file-icon"><span className="fa fa-file-o" style={{fontSize: '50px'}} /></div>
      <div className="rdsu-filename">{uploadedFile.file.name}</div>
    </div>
  )

  renderProgress = ({progress}) => (progress ? (<div className="rdsu-progress">{progress}</div>) : null)

  renderError = ({error}) => (error ? (<div className="rdsu-error small">{error}</div>) : null)

  render() {
    const {
      s3Url,
      passChildrenProps,
      children,
      imageComponent,
      fileComponent,
      progressComponent,
      errorComponent,
      ...dropzoneProps,
    } = this.props

    const ImageComponent = imageComponent || this.renderImage
    const FileComponent = fileComponent || this.renderFile
    const ProgressComponent = progressComponent || this.renderProgress
    const ErrorComponent = errorComponent || this.renderError

    const {uploadedFiles} = this.state
    const childProps = {s3Url, ...this.state}
    this.props.notDropzoneProps.forEach(prop => delete dropzoneProps[prop])

    let content = null
    if (children) {
      content = passChildrenProps ?
        React.Children.map(children, child => React.cloneElement(child, childProps)) :
        this.props.children
    }
    else {
      content = (
        <div>
          {uploadedFiles.map(uploadedFile => {
            const props = {
              key: uploadedFile.filename,
              uploadedFile: uploadedFile,
              ...childProps
            }
            return this.props.isImage(uploadedFile.fileUrl) ?
              (<ImageComponent  {...props} />) :
              (<FileComponent {...props} />)
          })}
          <ProgressComponent {...childProps} />
          <ErrorComponent {...childProps} />
        </div>
      )
    }

    return (
      <Dropzone onDrop={this.handleDrop} {...dropzoneProps}>
        {content}
      </Dropzone>
    )
  }
}
